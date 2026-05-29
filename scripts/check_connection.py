from chain import connect

def main():
    s = connect()
    chain = s.chain
    block = s.get_block_number(s.get_chain_head())
    print(f"chain={chain} block={block} ss58={s.ss58_format}")
    assert "ortaldot" in chain or chain == "Development", f"unexpected chain: {chain}"
    assert isinstance(block, int) and block >= 0
    print("CONNECTION OK")
    s.close()

if __name__ == "__main__":
    main()
